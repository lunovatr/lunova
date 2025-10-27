import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../lib/api';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  // Başlangıçta uygulama açıldığında auth durumu doğrulanana kadar
  // yönlendirmeleri engellemek için loading true olsun.
  loading: true
};

export const fetchMe = createAsyncThunk<User>(
  'auth/fetchMe',
  async () => {
    try {
      const response = await api.get<User>('/api/v1/accounts/me/');
      return response.data;
    } catch (error) {
      console.log('Kullanıcı bilgileri alınamadı');
      throw error;
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/api/v1/accounts/logout/');
      return true;
    } catch (error) {
      return rejectWithValue('Çıkış yaparken bir hata oluştu');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchMe cases
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      // logout cases
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.loading = false;
        // Hata durumunda state'i değiştirme
      });
  }
});

export const {} = authSlice.actions; // No actions, using thunks instead

export default authSlice.reducer;
