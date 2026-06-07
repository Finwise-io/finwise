// Jest mock for the native SecureStore module (keychain), backed by an in-memory map.
const store = {};
module.exports = {
  getItemAsync: async (k) => (k in store ? store[k] : null),
  setItemAsync: async (k, v) => { store[k] = v; },
  deleteItemAsync: async (k) => { delete store[k]; },
};
