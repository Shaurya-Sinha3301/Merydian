from app.services.demo_seed import reset_all, seed_all


class DemoProvisionService:
    """Thin wrapper kept for existing callers; the logic lives in demo_seed."""

    @staticmethod
    def provision_all() -> bool:
        seed_all()
        return True

    @staticmethod
    def reset_demo() -> bool:
        reset_all()
        return DemoProvisionService.provision_all()
