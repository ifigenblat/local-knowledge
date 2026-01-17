import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching collections
export const fetchCollections = createAsyncThunk(
  'collections/fetchCollections',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/collections', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch collections');
    }
  }
);

// Async thunk for creating a collection
export const createCollection = createAsyncThunk(
  'collections/createCollection',
  async (collectionData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/collections', collectionData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create collection');
    }
  }
);

// Async thunk for adding a card to a collection
export const addCardToCollection = createAsyncThunk(
  'collections/addCardToCollection',
  async ({ collectionId, cardId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/collections/${collectionId}/cards`,
        { cardId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return { collectionId, collection: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add card to collection');
    }
  }
);

// Async thunk for removing a card from a collection
export const removeCardFromCollection = createAsyncThunk(
  'collections/removeCardFromCollection',
  async ({ collectionId, cardId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `/api/collections/${collectionId}/cards/${cardId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return { collectionId, collection: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove card from collection');
    }
  }
);

// Async thunk for fetching a single collection
export const fetchCollection = createAsyncThunk(
  'collections/fetchCollection',
  async (collectionId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/collections/${collectionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch collection');
    }
  }
);

// Async thunk for updating a collection
export const updateCollectionAsync = createAsyncThunk(
  'collections/updateCollectionAsync',
  async ({ collectionId, collectionData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/collections/${collectionId}`, collectionData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update collection');
    }
  }
);

// Async thunk for deleting a collection
export const deleteCollectionAsync = createAsyncThunk(
  'collections/deleteCollectionAsync',
  async (collectionId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/collections/${collectionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return collectionId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete collection');
    }
  }
);

const initialState = {
  collections: [],
  loading: false,
  error: null,
};

const collectionSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    addCollection: (state, action) => {
      state.collections.unshift(action.payload);
    },
    updateCollection: (state, action) => {
      const index = state.collections.findIndex(collection => collection._id === action.payload._id);
      if (index !== -1) {
        state.collections[index] = action.payload;
      }
    },
    deleteCollection: (state, action) => {
      state.collections = state.collections.filter(collection => collection._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCollections.fulfilled, (state, action) => {
        state.loading = false;
        state.collections = action.payload.collections || action.payload;
      })
      .addCase(fetchCollections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCollection.fulfilled, (state, action) => {
        state.collections.unshift(action.payload);
      })
      .addCase(addCardToCollection.fulfilled, (state, action) => {
        const { collectionId, collection } = action.payload;
        const index = state.collections.findIndex(col => col._id === collectionId);
        if (index !== -1) {
          state.collections[index] = collection;
        }
      })
      .addCase(removeCardFromCollection.fulfilled, (state, action) => {
        const { collectionId, collection } = action.payload;
        const index = state.collections.findIndex(col => col._id === collectionId);
        if (index !== -1) {
          state.collections[index] = collection;
        }
      })
      .addCase(fetchCollection.fulfilled, (state, action) => {
        // Update the collection in the list if it exists
        const index = state.collections.findIndex(col => col._id === action.payload._id);
        if (index !== -1) {
          state.collections[index] = action.payload;
        } else {
          // If not in list, add it
          state.collections.unshift(action.payload);
        }
      })
      .addCase(updateCollectionAsync.fulfilled, (state, action) => {
        const index = state.collections.findIndex(col => col._id === action.payload._id);
        if (index !== -1) {
          state.collections[index] = action.payload;
        }
      })
      .addCase(deleteCollectionAsync.fulfilled, (state, action) => {
        state.collections = state.collections.filter(col => col._id !== action.payload);
      });
  },
});

export const {
  addCollection,
  updateCollection,
  deleteCollection,
} = collectionSlice.actions;

export default collectionSlice.reducer;
