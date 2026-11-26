import type { Account, AuthTokens } from "@/auth/types";

export const tokensFixture: AuthTokens = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
};

export const driverAccountFixture: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "driver@truckconnect.test",
  fullName: "Dana Driver",
  phone: "+61400000000",
  role: "DRIVER",
  status: "ACTIVE",
  emergencyContact: null,
  abn: null,
  licenceClass: null,
  licenceNumber: null,
  emailVerified: true,
  phoneVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: null,
  lastSeenAt: null,
};
