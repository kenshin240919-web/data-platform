from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL, DATA_MODE, ENV
from .models import Base

def build_engine(url):
    engine = create_engine(url, pool_pre_ping=True, connect_args={'check_same_thread':False} if url.startswith('sqlite') else {})
    if url.startswith('sqlite'):
        engine = engine.execution_options(schema_translate_map={k:None for k in ('core','trip','ingest','ops')})
        @event.listens_for(engine, 'connect')
        def sqlite_setup(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
            connection.execute('PRAGMA busy_timeout=10000')
    return engine

engine = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def initialize(target=engine):
    if target.dialect.name == 'postgresql':
        with target.begin() as conn:
            for schema in ('core','trip','ingest','ops'):
                conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS {schema}'))
    Base.metadata.create_all(target)

def get_db():
    with SessionLocal() as session:
        yield session

if __name__ == '__main__':
    initialize()
    print('신규 GuideJung DB v1 schema 준비 완료')

