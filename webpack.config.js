const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const glob = require('glob');

const stateHandlerEntries = glob.sync('./src/scripts/stateHandlers/*.ts').reduce((entries, entry) => {
  entries.push(`./${entry}`);
  return entries;
}, []);

module.exports = {
  mode: 'development',
  entry: {
    main: './src/index.tsx',
    camera: './src/scripts/feed.ts',
    stateHandlers: stateHandlerEntries.length > 0 ? stateHandlerEntries : './src/scripts/stateHandlers/default.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body',
      chunks: ['main'],
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      template: './public/feed.html',
      inject: 'body',
      chunks: ['main', 'camera', 'stateHandlers'],
      filename: 'feed.html'
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 3000,
    historyApiFallback: true
  }
};