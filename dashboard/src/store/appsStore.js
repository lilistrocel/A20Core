import { create } from 'zustand';
import apiClient from '../services/apiClient';

export const useAppsStore = create((set, get) => ({
  apps: [],
  displaySheets: {},
  loading: false,
  error: null,

  loadApps: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/api/v1/apps');
      const apps = response.data.data || [];
      set({ apps, loading: false });

      // Load display sheets for each app
      apps.forEach((app) => {
        get().loadDisplaySheet(app.app_id);
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  loadDisplaySheet: async (appId) => {
    try {
      const response = await apiClient.get(`/api/v1/apps/${appId}/display-sheet`);
      if (response.data.success) {
        set((state) => ({
          displaySheets: {
            ...state.displaySheets,
            [appId]: response.data.data,
          },
        }));
      }
    } catch (error) {
      console.error(`Failed to load display sheet for ${appId}:`, error);
      // Not all apps may have display sheets, so we don't set error state
    }
  },

  getAppById: (appId) => {
    return get().apps.find((app) => app.app_id === appId);
  },

  getDisplaySheet: (appId) => {
    return get().displaySheets[appId];
  },
}));
