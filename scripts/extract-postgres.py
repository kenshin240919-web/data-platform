from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]/'runtime'
destination=(root/'postgres-bin').resolve()
destination.mkdir(exist_ok=True)
with zipfile.ZipFile(root/'postgresql-binaries.zip') as archive:
    count=0
    for item in archive.infolist():
        if not item.filename.startswith(('pgsql/bin/','pgsql/lib/','pgsql/share/')):continue
        target=(destination/item.filename).resolve()
        if not target.is_relative_to(destination):raise ValueError('잘못된 archive 경로')
        archive.extract(item,destination);count+=1
print('프로젝트 전용 PostgreSQL 파일:',count)
