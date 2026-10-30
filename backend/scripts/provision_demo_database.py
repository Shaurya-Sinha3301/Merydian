import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.demo_provision_service import DemoProvisionService

def main():
    if "--reset" in sys.argv:
        DemoProvisionService.reset_demo()
    else:
        DemoProvisionService.provision_all()

if __name__ == "__main__":
    main()
