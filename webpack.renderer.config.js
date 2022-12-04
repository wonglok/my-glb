const rules = require('./webpack.rules')

rules.push({
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
    module: {
        rules,
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: './src/static' }],
        }),
    ],
}
