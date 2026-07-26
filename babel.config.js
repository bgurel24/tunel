// Reanimated 4 için worklets eklentisi şart ve listenin EN SONUNDA olmalı.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
