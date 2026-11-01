'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

function createNodeConfig({ entry, externals = {}, filename, outputPath }) {
  /** @type WebpackConfig */
  return {
    target: 'node',
    mode: 'none',
    entry,
    output: {
      path: outputPath,
      filename,
      libraryTarget: 'commonjs-static',
    },
    externals,
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                compilerOptions: {
                  module: 'ESNext',
                  moduleResolution: 'Bundler',
                },
              },
            },
          ],
        },
      ],
    },
    ignoreWarnings: [
      {
        module: /typescript[\\/]lib[\\/]typescript\.js$/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /vscode-languageserver-types[\\/]lib[\\/]umd[\\/]main\.js$/,
        message:
          /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ],
    devtool: 'nosources-source-map',
    infrastructureLogging: {
      level: 'log',
    },
  };
}

const extensionConfig = createNodeConfig({
  entry: './src/extension.ts',
  externals: {
    vscode: 'commonjs vscode',
  },
  filename: 'extension.js',
  outputPath: path.resolve(__dirname, 'dist'),
});

const languageServerConfig = createNodeConfig({
  entry: './node_modules/@koppajs/koppajs-language-server/dist/server.js',
  filename: 'language-server.js',
  outputPath: path.resolve(__dirname, 'dist'),
});

module.exports = [extensionConfig, languageServerConfig];
