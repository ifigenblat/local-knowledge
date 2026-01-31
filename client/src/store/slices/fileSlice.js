import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchFiles = createAsyncThunk(
  'files/fetchFiles',
  async ({ page = 1, limit = 20, search } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const params = { page, limit };
      if (search) params.search = search;
      const response = await axios.get('/api/files', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return {
        files: response.data.files || [],
        pagination: response.data.pagination || {},
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch files';
      return rejectWithValue(msg);
    }
  }
);

export const deleteFileAsync = createAsyncThunk(
  'files/deleteFile',
  async (filename, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/files/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { filename, ...response.data };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete file';
      return rejectWithValue(msg);
    }
  }
);

const fileSlice = createSlice({
  name: 'files',
  initialState: {
    files: [],
    loading: false,
    deleting: null,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  },
  reducers: {
    clearFileError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload.files || action.payload;
        if (action.payload.pagination) {
          state.pagination = { ...state.pagination, ...action.payload.pagination };
        }
        state.error = null;
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteFileAsync.pending, (state, action) => {
        state.deleting = action.meta.arg;
        state.error = null;
      })
      .addCase(deleteFileAsync.fulfilled, (state, action) => {
        state.deleting = null;
        state.files = state.files.filter((f) => f.filename !== action.payload.filename);
        if (state.pagination.total > 0) state.pagination.total -= 1;
        state.error = null;
      })
      .addCase(deleteFileAsync.rejected, (state, action) => {
        state.deleting = null;
        state.error = action.payload;
      });
  },
});

export const { clearFileError } = fileSlice.actions;
export default fileSlice.reducer;
