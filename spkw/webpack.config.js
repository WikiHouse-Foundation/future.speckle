var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
    context: __dirname,
    entry: {
        Default: "./src/js/Default.js",
        Multiple: "./src/js/Multiple.js",
        Parallel: "./src/js/Parallel.js",
        Split: "./src/js/Split.js",
        Template: "./src/js/Template.js"
    },
    output: {
        path: "./dist/",
        publicPath: "/",
        filename: "js/[name].js"
    },
    module: {
        loaders: [
            {test: /\.(js|jsx)$/, exclude: /node_modules/, loader: "babel-loader"},
            {test: /\.css$/, loader: ExtractTextPlugin.extract("style-loader", "css-loader")},
            {test: /\.(jpg|png|svg)$/, loader: "file-loader?name=img/[hash].[ext]"},
            {test: /\.(woff|woff2|ttf|eot)$/, loader: "file-loader?name=fonts/[hash].[ext]"}
        ]
    },
    plugins: [
        new ExtractTextPlugin("css/[name].css")
    ]
};
