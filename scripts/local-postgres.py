"""Isolated localhost PostgreSQL; no system service or external server changes."""
import argparse,os,secrets,subprocess,shutil
from pathlib import Path
from dotenv import dotenv_values
import psycopg

ROOT=Path(__file__).resolve().parents[1]
# ASCII path outside OneDrive (PostgreSQL on Windows breaks on non-ASCII paths like '문서') and outside
# AppData: packaged apps (e.g. the Claude desktop app) get AppData writes redirected to a private copy,
# so a DB there is invisible to normal programs. The user profile root is shared by everyone.
RUNTIME=Path(os.environ.get('GUIDEJUNG_PG_HOME') or Path.home()/'guidejung-data-postgres')
BIN=RUNTIME/'pgsql'/'bin'
DATA=RUNTIME/'postgres-data'
ENV_FILE=ROOT/'.env.postgres-local'
PORT=55432

def run(name,*args,env=None):
    with (RUNTIME/'command.log').open('wb') as output:
        process=subprocess.run([str(BIN/(name+'.exe')),*map(str,args)],cwd=RUNTIME,env=env,stdout=output,stderr=output)
    if process.returncode:
        message=(RUNTIME/'command.log').read_text(encoding='utf-8',errors='replace')
        raise RuntimeError(f'{name} 실패: {message[:600]}')

def setup():
    # Saved credentials mean a DB already exists somewhere: never silently create a new empty one.
    if ENV_FILE.exists() and not DATA.exists():
        raise RuntimeError(f'기존 로컬 DB를 찾지 못했습니다: {DATA} — 새 DB를 만들지 않고 멈춥니다(데이터 보호). Claude에게 이 메시지를 보여 주세요.')
    RUNTIME.mkdir(exist_ok=True)
    if not (BIN/'initdb.exe').exists():
        shutil.copytree(ROOT/'runtime'/'postgres-bin'/'pgsql',RUNTIME/'pgsql',dirs_exist_ok=True)
    if not (BIN/'initdb.exe').exists():raise RuntimeError('프로젝트 runtime의 PostgreSQL 배포본이 필요합니다.')
    if not DATA.exists():
        import socket
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1',PORT))==0:raise RuntimeError('전용 DB 포트가 이미 사용 중입니다.')
        password=secrets.token_hex(32)
        password_file=RUNTIME/'postgres-init-password'
        password_file.write_text(password,encoding='ascii')
        try:run('initdb','-D',DATA,'-U','guidejung_local','--auth=scram-sha-256','--encoding=UTF8','--locale=C','--pwfile',password_file)
        finally:password_file.unlink(missing_ok=True)
        with (DATA/'postgresql.conf').open('a',encoding='utf-8') as file:
            file.write("\nlisten_addresses = '127.0.0.1'\nport = 55432\n")
        ENV_FILE.write_text(f'DATABASE_URL=postgresql://guidejung_local:{password}@127.0.0.1:{PORT}/guidejung_data\n',encoding='utf-8')
    url=dotenv_values(ENV_FILE).get('DATABASE_URL')
    if not url:raise RuntimeError('로컬 DB의 전용 자격증명 파일이 없습니다.')
    running=subprocess.run([str(BIN/'pg_ctl.exe'),'-D',str(DATA),'status'],capture_output=True).returncode==0
    if not running:run('pg_ctl','-D',DATA,'-l',RUNTIME/'postgres.log','-w','start')
    from urllib.parse import urlparse
    connection=urlparse(url)
    with psycopg.connect(host='127.0.0.1',port=PORT,user='guidejung_local',password=connection.password,dbname='postgres',autocommit=True) as database:
        if not database.execute("SELECT 1 FROM pg_database WHERE datname='guidejung_data'").fetchone():database.execute('CREATE DATABASE guidejung_data')
    print('프로젝트 전용 PostgreSQL 준비 완료 (localhost:55432).')
    return url

def backup(url):
    target=RUNTIME/'guidejung-local-backup.dump'
    from urllib.parse import urlparse
    connection=urlparse(url)
    process_env={**os.environ,'PGPASSWORD':connection.password}
    run('pg_dump','-h','127.0.0.1','-p',PORT,'-U','guidejung_local','-d','guidejung_data','-Fc','-f',target,env=process_env)
    print(f'로컬 DB backup 생성 완료: {target}')
    return target

def verify_backup(url):
    from urllib.parse import urlparse
    from psycopg import sql
    connection=urlparse(url)
    name='guidejung_restore_'+secrets.token_hex(6)
    options=dict(host='127.0.0.1',port=PORT,user='guidejung_local',password=connection.password)
    target=backup(url)
    with psycopg.connect(**options,dbname='postgres',autocommit=True) as admin:
        admin.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
        try:
            run('pg_restore','-h','127.0.0.1','-p',PORT,'-U','guidejung_local','-d',name,'--exit-on-error',target,env={**os.environ,'PGPASSWORD':connection.password})
            with psycopg.connect(**options,dbname='guidejung_data') as original,psycopg.connect(**options,dbname=name) as restored:
                for table in ['core.regions','core.places','trip.place_profiles','trip.events','ingest.raw_records']:
                    query=sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier(*table.split('.')))
                    if original.execute(query).fetchone()!=restored.execute(query).fetchone():raise RuntimeError('복원 후 데이터 건수 불일치')
            print('별도 임시 DB에서 백업 복원 및 주요 테이블 건수 검증 통과.')
        finally:admin.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(name)))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['setup','backup','verify-backup','stop']);args=parser.parse_args()
    if args.command=='stop':
        # A collection/sync in another window still needs the DB (e.g. the .bat was started twice).
        import sys;sys.path.insert(0,str(ROOT/'services'/'api'))
        from app.tourapi import lock_busy
        if lock_busy():print('다른 창에서 수집·동기화가 진행 중이라 DB를 끄지 않습니다.')
        else:run('pg_ctl','-D',DATA,'-m','fast','-w','stop')
    else:
        url=setup()
        if args.command=='backup':backup(url)
        if args.command=='verify-backup':verify_backup(url)
