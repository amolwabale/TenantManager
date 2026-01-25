export type AuthStackParamList = {
  AuthScreen: undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
};

export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
};

export type TenantStackParamList = {
  TenantList: undefined;
  TenantView: { tenantId: number };
  TenantForm: { tenantId?: number; mode: 'add' | 'edit' };
};