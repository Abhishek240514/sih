import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app.core.config import settings

settings.debug = True
settings.log_level = "DEBUG"