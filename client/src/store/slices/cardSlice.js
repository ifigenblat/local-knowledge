import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching cards (optional: { page, limit, search, type, category } — server-side pagination)
export const fetchCards = createAsyncThunk(
  'cards/fetchCards',
  async ({ page = 1, limit = 20, search, type, category, source, sourceFileType, dateFrom, dateTo, sortBy, sortOrder } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const params = { page, limit };
      if (search) params.search = search;
      if (type) params.type = type;
      if (category) params.category = category;
      if (source) params.source = source;
      if (sourceFileType) params.sourceFileType = sourceFileType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      const response = await axios.get('/api/cards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      const generic = data?.error === 'Server error' && data?.message;
      const msg = generic ? data.message : (data?.error || data?.message || error.message || 'Failed to fetch cards');
      return rejectWithValue(msg);
    }
  }
);

// Async thunk for fetching cards count only (optional: { search, type, category } — same filters as list)
export const fetchCardsCount = createAsyncThunk(
  'cards/fetchCardsCount',
  async ({ search, type, category, source, sourceFileType, dateFrom, dateTo } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (search) params.search = search;
      if (type) params.type = type;
      if (category) params.category = category;
      if (source) params.source = source;
      if (sourceFileType) params.sourceFileType = sourceFileType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const response = await axios.get('/api/cards/count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      });
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      const msg = data?.error || data?.message || error.message || 'Failed to fetch cards count';
      return rejectWithValue(msg);
    }
  }
);

// Async thunk for creating a card
export const createCardAsync = createAsyncThunk(
  'cards/createCardAsync',
  async (cardData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/cards', cardData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create card');
    }
  }
);

// Async thunk for updating a card
export const updateCardAsync = createAsyncThunk(
  'cards/updateCardAsync',
  async ({ cardId, cardData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/cards/${cardId}`, cardData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update card');
    }
  }
);

// Async thunk for deleting a card
export const deleteCardAsync = createAsyncThunk(
  'cards/deleteCardAsync',
  async (cardId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/cards/${cardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return cardId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete card');
    }
  }
);

// Async thunk for regenerating a card from snippet
export const regenerateCardAsync = createAsyncThunk(
  'cards/regenerateCardAsync',
  async ({ cardId, useAI = false, comparisonMode = false, selectedVersion = null, comparisonData = null }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/cards/${cardId}/regenerate`,
        { useAI, comparisonMode, selectedVersion, comparisonData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Failed to regenerate card');
    }
  }
);

// Async thunk for checking AI status (provider-agnostic)
export const checkAIStatusAsync = createAsyncThunk(
  'cards/checkAIStatusAsync',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ai/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { enabled: false, available: false, error: 'Failed to check AI status' });
    }
  }
);

const initialState = {
  cards: [],
  loading: false,
  error: null,
  filters: {
    type: '',
    category: '',
    search: '',
  },
  pagination: {
    current: 1,
    total: 0,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  },
  aiStatus: {
    enabled: false,
    available: false,
    checking: false,
    error: null,
    provider: null,
    model: null,
    cloudLabel: null,
  },
};

const cardSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    addCard: (state, action) => {
      // Check if card already exists to avoid duplicates
      const existingCard = state.cards.find(card => card._id === action.payload._id);
      if (!existingCard) {
        state.cards.unshift(action.payload);
      }
    },
    addMultipleCards: (state, action) => {
      // Add multiple cards, avoiding duplicates
      const newCards = action.payload.filter(newCard => 
        !state.cards.find(existingCard => existingCard._id === newCard._id)
      );
      state.cards.unshift(...newCards);
    },
    updateCard: (state, action) => {
      const index = state.cards.findIndex(card => card._id === action.payload._id);
      if (index !== -1) {
        state.cards[index] = action.payload;
      }
    },
    deleteCard: (state, action) => {
      state.cards = state.cards.filter(card => card._id !== action.payload);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        type: '',
        category: '',
        search: '',
      };
    },
    clearCards: (state) => {
      state.cards = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCards.fulfilled, (state, action) => {
        state.loading = false;
        const newCards = action.payload.cards || action.payload;
        if (Array.isArray(newCards)) {
          state.cards = newCards;
        }
        if (action.payload.pagination) {
          state.pagination = { ...state.pagination, ...action.payload.pagination };
        }
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCardsCount.fulfilled, (state, action) => {
        if (action.payload?.count != null) {
          state.pagination.totalCount = action.payload.count;
        }
      })
      .addCase(createCardAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCardAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Add the new card to the beginning of the cards array
        state.cards.unshift(action.payload);
      })
      .addCase(createCardAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCardAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCardAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Update the card in the state
        const index = state.cards.findIndex(card => card._id === action.payload._id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
      })
      .addCase(updateCardAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteCardAsync.fulfilled, (state, action) => {
        // Remove the deleted card from the state
        state.cards = state.cards.filter(card => card._id !== action.payload);
      })
      .addCase(deleteCardAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(regenerateCardAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(regenerateCardAsync.fulfilled, (state, action) => {
        state.loading = false;
        // Update the regenerated card in the state
        const index = state.cards.findIndex(card => card._id === action.payload._id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
      })
      .addCase(regenerateCardAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkAIStatusAsync.pending, (state) => {
        state.aiStatus.checking = true;
      })
      .addCase(checkAIStatusAsync.fulfilled, (state, action) => {
        state.aiStatus.checking = false;
        state.aiStatus.enabled = action.payload.enabled || false;
        state.aiStatus.available = action.payload.available || false;
        state.aiStatus.error = action.payload.error || null;
        state.aiStatus.provider = action.payload.provider || null;
        state.aiStatus.model = action.payload.model || null;
        state.aiStatus.cloudLabel = action.payload.cloudLabel || null;
      })
      .addCase(checkAIStatusAsync.rejected, (state, action) => {
        state.aiStatus.checking = false;
        state.aiStatus.enabled = false;
        state.aiStatus.available = false;
        state.aiStatus.error = action.payload?.error || 'Failed to check AI status';
        state.aiStatus.provider = null;
        state.aiStatus.model = null;
        state.aiStatus.cloudLabel = null;
      });
  },
});

export const {
  addCard,
  addMultipleCards,
  updateCard,
  deleteCard,
  setFilters,
  clearFilters,
  clearCards,
} = cardSlice.actions;

export default cardSlice.reducer;
