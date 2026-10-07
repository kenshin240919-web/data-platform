import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv

ROOT = Path(os.environ['GUIDEJUNG_ROOT']) if 'GUIDEJUNG_ROOT' in os.environ else Path(__file__).resolve().parents[3]
load_dotenv(ROOT / '.env')
ENV = os.getenv('APP_ENV', 'development')
DATA_MODE = os.getenv('DATA_MODE', 'demo')
COLLECTION_TARGET=int(os.getenv('TRIP_COLLECTION_TARGET','200'))
if not 100<=COLLECTION_TARGET<=3000:raise RuntimeError('수집 목표는 100~3000건입니다.')
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///runtime/guidejung.db')
if DATABASE_URL.startswith('sqlite:///'):
    location = Path(DATABASE_URL.removeprefix('sqlite:///'))
    if not location.is_absolute():
        location = ROOT / location
    location.parent.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = 'sqlite:///' + location.as_posix()
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', '')
# Condition evidence (free/kids/pet/indoor) stays usable this long; SEO freshness stays 30 days.
CONDITION_MAX_AGE_DAYS = int(os.getenv('CONDITION_MAX_AGE_DAYS', '365'))
SEO_ENABLED = os.getenv('SEO_ENABLED', 'false').lower() == 'true'
URLS = {'home': os.getenv('HOME_PUBLIC_URL', 'http://localhost:3100'), 'trip': os.getenv('TRIP_PUBLIC_URL', 'http://localhost:3101')}
for service, url in URLS.items():
    host = urlparse(url).hostname
    if host not in {'localhost', '127.0.0.1', f'{service}.guidejung.com'}:
        raise RuntimeError(f'{service}: 신규 호스트만 허용합니다.')
if DATA_MODE not in {'demo', 'live'}:
    raise RuntimeError('DATA_MODE는 demo 또는 live여야 합니다.')
if ENV == 'production':
    if DATA_MODE != 'live' or not DATABASE_URL.startswith('postgresql+') or len(ADMIN_TOKEN) < 32:
        raise RuntimeError('production은 live 모드·신규 PostgreSQL·32자 이상 ADMIN_TOKEN이 필수입니다.')

