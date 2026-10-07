from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

def uid(): return str(uuid4())
def now(): return datetime.now(timezone.utc)

class Base(DeclarativeBase): pass

class RegionVersion(Base):
    __tablename__ = 'region_versions'
    __table_args__ = {'schema': 'core'}
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    source: Mapped[str] = mapped_column(Text)
    as_of: Mapped[str] = mapped_column(String(10))
    checksum: Mapped[str] = mapped_column(String(64))

class Region(Base):
    __tablename__ = 'regions'
    __table_args__ = (UniqueConstraint('version_id','code_system','code'), {'schema':'core'})
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    version_id: Mapped[str] = mapped_column(ForeignKey('core.region_versions.id'))
    code_system: Mapped[str] = mapped_column(String(40))
    code: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(120))
    level: Mapped[str] = mapped_column(String(20))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey('core.regions.id'), nullable=True)
    valid_from: Mapped[str | None] = mapped_column(String(10), nullable=True)
    valid_to: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='active')

class RegionMapping(Base):
    __tablename__='region_mappings'
    __table_args__=(UniqueConstraint('source_system','source_code','valid_from'),{'schema':'core'})
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    source_system: Mapped[str]=mapped_column(String(60))
    source_code: Mapped[str]=mapped_column(String(40))
    region_id: Mapped[str]=mapped_column(ForeignKey('core.regions.id'))
    evidence: Mapped[str]=mapped_column(Text)
    valid_from: Mapped[str]=mapped_column(String(10))
    valid_to: Mapped[str | None]=mapped_column(String(10),nullable=True)

class RegionCrosswalk(Base):
    __tablename__='region_crosswalks'
    __table_args__={'schema':'core'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    legal_id: Mapped[str]=mapped_column(ForeignKey('core.regions.id'))
    administrative_id: Mapped[str]=mapped_column(ForeignKey('core.regions.id'))
    valid_from: Mapped[str]=mapped_column(String(10))
    valid_to: Mapped[str | None]=mapped_column(String(10),nullable=True)
    evidence: Mapped[str]=mapped_column(Text)

class Source(Base):
    __tablename__='data_sources'
    __table_args__={'schema':'core'}
    id: Mapped[str]=mapped_column(String(40),primary_key=True)
    name: Mapped[str]=mapped_column(String(160))
    url: Mapped[str]=mapped_column(Text)
    api_version: Mapped[str]=mapped_column(String(40))
    license: Mapped[str]=mapped_column(Text)

class Dataset(Base):
    __tablename__='dataset_versions'
    __table_args__={'schema':'ingest'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    source_id: Mapped[str]=mapped_column(ForeignKey('core.data_sources.id'))
    region_version_id: Mapped[str | None]=mapped_column(ForeignKey('core.region_versions.id'),nullable=True)
    status: Mapped[str]=mapped_column(String(24),index=True,default='staging')
    is_demo: Mapped[bool]=mapped_column(Boolean,default=False)
    rule_version: Mapped[str]=mapped_column(String(40),default='v1')
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    published_at: Mapped[datetime | None]=mapped_column(DateTime(timezone=True),nullable=True)

class Place(Base):
    __tablename__='places'
    __table_args__={'schema':'core'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True)
    name: Mapped[str]=mapped_column(String(200),index=True)
    address_raw: Mapped[str]=mapped_column(Text)
    address: Mapped[str]=mapped_column(Text)
    province_id: Mapped[str | None]=mapped_column(ForeignKey('core.regions.id'),nullable=True)
    region_id: Mapped[str | None]=mapped_column(ForeignKey('core.regions.id'),index=True,nullable=True)
    legal_dong_id: Mapped[str | None]=mapped_column(ForeignKey('core.regions.id'),nullable=True)
    administrative_dong_id: Mapped[str | None]=mapped_column(ForeignKey('core.regions.id'),nullable=True)
    latitude: Mapped[float | None]=mapped_column(Float,nullable=True)
    longitude: Mapped[float | None]=mapped_column(Float,nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class PlaceSource(Base):
    __tablename__='place_sources'
    __table_args__=(UniqueConstraint('source_id','external_id'),{'schema':'core'})
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    place_id: Mapped[str]=mapped_column(ForeignKey('core.places.id'),index=True)
    source_id: Mapped[str]=mapped_column(ForeignKey('core.data_sources.id'))
    external_id: Mapped[str]=mapped_column(String(80))
    source_modified_at: Mapped[str | None]=mapped_column(String(40),nullable=True)
    fetched_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    verified_at: Mapped[datetime | None]=mapped_column(DateTime(timezone=True),nullable=True)
    record_hash: Mapped[str]=mapped_column(String(64))

class Profile(Base):
    __tablename__='place_profiles'
    __table_args__=(UniqueConstraint('place_id','dataset_id'),{'schema':'trip'})
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    place_id: Mapped[str]=mapped_column(ForeignKey('core.places.id'),index=True)
    dataset_id: Mapped[str]=mapped_column(ForeignKey('ingest.dataset_versions.id'),index=True)
    snapshot: Mapped[dict]=mapped_column(JSON)
    kind: Mapped[str]=mapped_column(String(30),index=True)
    description: Mapped[str]=mapped_column(Text,default='')
    hours: Mapped[str | None]=mapped_column(Text,nullable=True)
    closed_days: Mapped[str | None]=mapped_column(Text,nullable=True)
    fee: Mapped[str | None]=mapped_column(Text,nullable=True)
    phone: Mapped[str | None]=mapped_column(String(100),nullable=True)
    official_url: Mapped[str | None]=mapped_column(Text,nullable=True)
    conditions: Mapped[dict]=mapped_column(JSON,default=dict)
    evidence: Mapped[dict]=mapped_column(JSON,default=dict)
    quality_score: Mapped[int]=mapped_column(Integer,default=0)
    indexable: Mapped[bool]=mapped_column(Boolean,default=False)

class Event(Base):
    __tablename__='events'
    __table_args__=(UniqueConstraint('external_id','dataset_id'),{'schema':'trip'})
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    dataset_id: Mapped[str]=mapped_column(ForeignKey('ingest.dataset_versions.id'),index=True)
    place_id: Mapped[str]=mapped_column(ForeignKey('core.places.id'))
    series_id: Mapped[str]=mapped_column(String(80))
    external_id: Mapped[str]=mapped_column(String(80))
    name: Mapped[str]=mapped_column(String(200))
    start_date: Mapped[str]=mapped_column(String(10),index=True)
    end_date: Mapped[str]=mapped_column(String(10),index=True)
    status: Mapped[str]=mapped_column(String(30),default='scheduled')
    organizer: Mapped[str | None]=mapped_column(Text,nullable=True)
    evidence: Mapped[str | None]=mapped_column(Text,nullable=True)

class Image(Base):
    __tablename__='images'
    __table_args__={'schema':'core'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    place_id: Mapped[str]=mapped_column(ForeignKey('core.places.id'))
    url: Mapped[str]=mapped_column(Text)
    credit: Mapped[str]=mapped_column(Text)
    license: Mapped[str]=mapped_column(String(80))
    modification_allowed: Mapped[bool]=mapped_column(Boolean,default=False)
    verified_at: Mapped[datetime | None]=mapped_column(DateTime(timezone=True),nullable=True)

class Category(Base):
    __tablename__='tourism_categories'
    __table_args__={'schema':'trip'}
    id: Mapped[str]=mapped_column(String(80),primary_key=True)
    code_system: Mapped[str]=mapped_column(String(60))
    name: Mapped[str]=mapped_column(String(100))
    parent_id: Mapped[str | None]=mapped_column(ForeignKey('trip.tourism_categories.id'),nullable=True)

class RawRecord(Base):
    __tablename__='raw_records'
    __table_args__={'schema':'ingest'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    dataset_id: Mapped[str]=mapped_column(ForeignKey('ingest.dataset_versions.id'))
    endpoint: Mapped[str]=mapped_column(String(100))
    external_id: Mapped[str]=mapped_column(String(80))
    payload: Mapped[dict]=mapped_column(JSON)
    checksum: Mapped[str]=mapped_column(String(64))
    fetched_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Validation(Base):
    __tablename__='data_validation'
    __table_args__={'schema':'ops'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    dataset_id: Mapped[str]=mapped_column(ForeignKey('ingest.dataset_versions.id'))
    external_id: Mapped[str]=mapped_column(String(80))
    rule: Mapped[str]=mapped_column(String(80))
    passed: Mapped[bool]=mapped_column(Boolean)
    reason: Mapped[str]=mapped_column(Text)

class SyncLog(Base):
    __tablename__='sync_logs'
    __table_args__={'schema':'ops'}
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    dataset_id: Mapped[str | None]=mapped_column(ForeignKey('ingest.dataset_versions.id'),nullable=True)
    status: Mapped[str]=mapped_column(String(30),default='running')
    total: Mapped[int]=mapped_column(Integer,default=0)
    completed: Mapped[int]=mapped_column(Integer,default=0)
    rejected: Mapped[int]=mapped_column(Integer,default=0)
    current_item: Mapped[str]=mapped_column(Text,default='')
    error: Mapped[str | None]=mapped_column(Text,nullable=True)
    started_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    finished_at: Mapped[datetime | None]=mapped_column(DateTime(timezone=True),nullable=True)

class PagePolicy(Base):
    __tablename__='page_index_policy'
    __table_args__=(UniqueConstraint('path','dataset_id'),{'schema':'ops'})
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    path: Mapped[str]=mapped_column(String(200))
    dataset_id: Mapped[str]=mapped_column(ForeignKey('ingest.dataset_versions.id'))
    indexable: Mapped[bool]=mapped_column(Boolean,default=False)
    reason: Mapped[str]=mapped_column(Text)

