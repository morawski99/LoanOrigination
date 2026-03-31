export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}
