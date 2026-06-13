const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// zustand's ESM `middleware` build uses `import.meta.env` (in its devtools
// helper). Metro serves the web bundle as a classic script, where
// `import.meta` is a parse-level syntax error — it white-screens the whole
// page. Resolve `zustand/middleware` to its CJS build on web only; native
// keeps the ESM build. We only use `persist`, so behaviour is unchanged.
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    );
  }
  return (baseResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
