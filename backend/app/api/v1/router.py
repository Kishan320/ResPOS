from fastapi import APIRouter

from app.api.v1 import (
    auth,
    catalog,
    cms,
    currency_api,
    dashboard,
    invoices,
    media,
    orders,
    organizations,
    rbac,
    report_hub,
    reports,
    restaurant,
    terminals,
    users,
)
from app.api.v1 import (
    dynamic_discount_promotion_coupon_seasonal_and_item_offer_management_controller as discount_promotion_controller,
)
from app.api.v1 import (
    super_admin_platform_operations_user_and_full_rbac_management_controller as platform_user_rbac_controller,
)
from app.api.v1 import (
    organization_owner_admin_staff_user_creation_with_full_rbac_permission_controller as org_staff_rbac_controller,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog & Inventory"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & POS"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(terminals.router, prefix="/terminals", tags=["Terminals & Customers"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports Classic"])
api_router.include_router(report_hub.router, prefix="/report-hub", tags=["Report Hub Export"])
api_router.include_router(restaurant.router, prefix="/restaurant", tags=["Restaurant Module"])
api_router.include_router(media.router, prefix="/media", tags=["Media Upload"])
api_router.include_router(cms.router, prefix="/cms", tags=["CMS"])
api_router.include_router(currency_api.router, prefix="/currency", tags=["Multi Currency"])
api_router.include_router(rbac.router, prefix="/rbac", tags=["RBAC"])
# Long self-describing prefixes (new modules)
api_router.include_router(
    discount_promotion_controller.router,
    prefix="/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management",
    tags=["Discount Promotion Engine"],
)
api_router.include_router(
    platform_user_rbac_controller.router,
    prefix="/super-admin-platform-operations-user-and-full-rbac-management",
    tags=["Super Admin Platform Users RBAC"],
)
api_router.include_router(
    org_staff_rbac_controller.router,
    prefix="/organization-owner-admin-staff-user-creation-with-full-rbac-permission",
    tags=["Organization Staff RBAC"],
)
