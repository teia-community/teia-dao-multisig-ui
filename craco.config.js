const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Resolve Node.js built-in polyfills for browser
      webpackConfig.resolve.fallback = Object.assign(
        webpackConfig.resolve.fallback || {},
        {
          process: require.resolve("process/browser"),
          buffer: require.resolve("buffer/"),
          crypto: require.resolve("crypto-browserify"),
          stream: require.resolve("stream-browserify"),
          path: require.resolve("path-browserify"),
        }
      );

      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );

      // CRA processes node_modules through babel-preset-react-app/dependencies,
      // which converts `**` to Math.pow(). That breaks BigInt ** BigInt used in
      // @noble/curves. Exclude @noble/curves from that loader so `**` is left intact.
      const oneOfRules = webpackConfig.module.rules.find((r) => r.oneOf)?.oneOf;
      if (oneOfRules) {
        const nodeBabelRule = oneOfRules.find(
          (r) =>
            r.loader?.includes("babel-loader") &&
            r.exclude?.toString().includes("runtime")
        );
        if (nodeBabelRule) {
          nodeBabelRule.exclude = [nodeBabelRule.exclude, /@noble[\\/]curves/];
        }
      }

      return webpackConfig;
    },
  },
};
