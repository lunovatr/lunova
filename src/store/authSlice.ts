import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../lib/api';
import type { User, ProfileResponse } from '../types/profile.types';

interface AuthState {
  user: User | null;
  userProfile: ProfileResponse | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null; // Hata takibi için eklendi
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Uygulama ilk açıldığında session kontrolü için
export const fetchMe = createAsyncThunk<User>(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<User>('/api/v1/accounts/me/');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Oturum bilgisi alınamadı');
    }
  }
);

// Profil sayfası için detaylı bilgi çekme
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ProfileResponse>("/api/v1/accounts/profile/");
      return response.data; // Artık dönen veri ProfileResponse tipinde
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Profil yüklenemedi");
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
  reducers: {
    // Manuel hata temizleme gerekirse
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchMe - Auth kontrolü
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

      // fetchProfile - Profil detaylarını getirme
      .addCase(fetchProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        const userData = action.payload;
        state.userProfile = userData;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // logout
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
      });
  }
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;