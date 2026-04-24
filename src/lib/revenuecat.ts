import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
} from "@revenuecat/purchases-capacitor";

/**
 * RevenueCat product identifiers — must match exactly what's configured
 * in App Store Connect and Google Play Console.
 */
export const RC_PRODUCT_IDS = {
  monthly: "com.stellara.pro.monthly",
  annual: "com.stellara.pro.annual",
} as const;

export type RcPlanKey = keyof typeof RC_PRODUCT_IDS;

/** Public RevenueCat SDK keys (safe to bundle on the client). */
const RC_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
const RC_API_KEY_ANDROID = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const RC_ENTITLEMENT_ID = "pro";

let configured = false;

export const isNativePurchasePlatform = (): boolean => {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
};

/** Initialize RevenueCat once per app session (no-op on web). */
export const initRevenueCat = async (appUserId?: string): Promise<void> => {
  if (configured) {
    if (appUserId) {
      try {
        await Purchases.logIn({ appUserID: appUserId });
      } catch (err) {
        console.warn("[RevenueCat] logIn failed", err);
      }
    }
    return;
  }
  if (!isNativePurchasePlatform()) return;

  const platform = Capacitor.getPlatform();
  const apiKey = platform === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) {
    console.warn(
      `[RevenueCat] Missing API key for ${platform}. Set VITE_REVENUECAT_${platform === "ios" ? "IOS" : "ANDROID"}_KEY.`,
    );
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey, appUserID: appUserId });
    configured = true;
  } catch (err) {
    console.error("[RevenueCat] configure failed", err);
  }
};

/** Map a RevenueCat entitlement check into our `subscribed` boolean. */
export const hasProEntitlement = (info: CustomerInfo): boolean => {
  return Boolean(info?.entitlements?.active?.[RC_ENTITLEMENT_ID]);
};

/** Fetch the active entitlement state from RevenueCat. */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (!isNativePurchasePlatform()) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    console.error("[RevenueCat] getCustomerInfo failed", err);
    return null;
  }
};

/** Find a package matching the given product identifier. */
const findPackage = async (productId: string): Promise<PurchasesPackage | null> => {
  const offerings = await Purchases.getOfferings();
  const offeringList: NonNullable<typeof offerings.current>[] = [];
  if (offerings.current) offeringList.push(offerings.current);
  for (const key of Object.keys(offerings.all ?? {})) {
    const o = offerings.all[key];
    if (o && o !== offerings.current) offeringList.push(o);
  }
  for (const offering of offeringList) {
    for (const pkg of offering.availablePackages ?? []) {
      if (pkg.product?.identifier === productId) return pkg;
    }
  }
  return null;
};

export type PurchaseResult =
  | { ok: true; subscribed: boolean; productId: string }
  | { ok: false; userCancelled: boolean; error?: string };

/** Trigger the native StoreKit / Play Billing purchase flow. */
export const purchaseProduct = async (planKey: RcPlanKey): Promise<PurchaseResult> => {
  if (!isNativePurchasePlatform()) {
    return { ok: false, userCancelled: false, error: "Native purchases unavailable on this platform." };
  }
  const productId = RC_PRODUCT_IDS[planKey];
  try {
    const pkg = await findPackage(productId);
    if (!pkg) {
      return { ok: false, userCancelled: false, error: `Product ${productId} not found in offerings.` };
    }
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    return {
      ok: true,
      subscribed: hasProEntitlement(result.customerInfo),
      productId,
    };
  } catch (err: unknown) {
    const e = err as { code?: string; userCancelled?: boolean; message?: string };
    const userCancelled = Boolean(e?.userCancelled) || e?.code === "1" || e?.code === "PURCHASE_CANCELLED";
    return { ok: false, userCancelled, error: e?.message ?? "Purchase failed" };
  }
};

/** Restore previous purchases (required by Apple). */
export const restorePurchases = async (): Promise<{ subscribed: boolean } | null> => {
  if (!isNativePurchasePlatform()) return null;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return { subscribed: hasProEntitlement(customerInfo) };
  } catch (err) {
    console.error("[RevenueCat] restorePurchases failed", err);
    return null;
  }
};