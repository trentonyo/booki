const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    main: './src/index.tsx',
    camera: './src/scripts/feed.js'
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
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 3000
  }
};
