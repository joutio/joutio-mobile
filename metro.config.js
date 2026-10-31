const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Modules évalués à leur premier usage : gain direct sur le démarrage à froid.
config.transformer.getTransformOptions = async () => ({
  transform: { experimentalImportSupport: false, inlineRequires: true },
});

module.exports = config;
