import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cardReducer from './slices/cardSlice';
import collectionReducer from './slices/collectionSlice';
import fileReducer from './slices/fileSlice';
import roleReducer from './slices/roleSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cards: cardReducer,
    collections: collectionReducer,
    files: fileReducer,
    roles: roleReducer,
    users: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;
