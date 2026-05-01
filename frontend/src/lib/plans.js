export const hasPlanFeature = (user, feature) => Boolean(user?.plan_features?.includes?.(feature));
