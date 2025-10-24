import { AnyAction } from 'redux';

export interface User {
  id?: number | string;
  email?: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  isAuthenticated: false,
};

// Action types
const SET_USER = 'auth/SET_USER';
const CLEAR_USER = 'auth/CLEAR_USER';
const SET_LOADING = 'auth/SET_LOADING';

export const setUser = (user: User) => ({ type: SET_USER, payload: user });
export const clearUser = () => ({ type: CLEAR_USER });
export const setLoading = (loading: boolean) => ({ type: SET_LOADING, payload: loading });

export default function authReducer(state = initialState, action: AnyAction): AuthState {
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case CLEAR_USER:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
      };
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}
