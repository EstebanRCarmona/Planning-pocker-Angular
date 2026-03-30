export enum RolUsuario {
  PLAYER = 'player',
  VIEWER = 'viewer',
  ADMIN = 'admin',
  VOID = '',
}

export interface User {
  id: string;
  gameId: string;
  name: string;
  rol?: RolUsuario;
  admin?:boolean;
  assigned: boolean;
  voted?: number;
}
export interface CreateUserRequest {
  name: string;
  rol:RolUsuario;
}
