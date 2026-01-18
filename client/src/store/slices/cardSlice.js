import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching cards
export const fetchCards = createAsyncThunk(
  'cards/fetchCards',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/cards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cards');
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
  async (cardId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/cards/${cardId}/regenerate`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.response?.data?.message || 'Failed to regenerate card');
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
    hasNext: false,
    hasPrev: false,
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
        // Only replace cards if we're doing a fresh fetch (not just adding new ones)
        // This prevents overwriting cards that were just added via addCard
        const newCards = action.payload.cards || action.payload;
        if (Array.isArray(newCards)) {
          // Merge existing cards with new cards, avoiding duplicates
          const existingCardIds = new Set(state.cards.map(card => card._id));
          const uniqueNewCards = newCards.filter(card => !existingCardIds.has(card._id));
          state.cards = [...uniqueNewCards, ...state.cards];
        }
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
