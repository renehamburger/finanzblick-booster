const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const srcDir = '../src/';

module.exports = {
    entry: {
        'finanzblick-booster-popup': path.join(__dirname, srcDir + 'popup.ts'),
        'finanzblick-booster-options': path.join(__dirname, srcDir + 'options.ts'),
        'finanzblick-booster-main': path.join(__dirname, srcDir + 'main.ts'),
        'finanzblick-booster-background': path.join(__dirname, srcDir + 'background.ts'),
        'finanzblick-booster-xhr-wrapper': path.join(__dirname, srcDir + 'xhr-wrapper.ts')
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
        filename: '[name].js'
    },
    optimization: {
        splitChunks: {
            name: 'vendor',
            chunks: "initial"
        }
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
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        // exclude locale files in moment
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyPlugin([
            { from: '.', to: '../' }
        ],
            { context: 'public' }
        ),
    ]
};
