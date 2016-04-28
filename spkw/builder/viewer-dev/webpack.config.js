var ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
    context: "/var/www/node/src",
    entry: {
        Default: "./js/Default.js",
        Multiple: "./js/Multiple.js",
        Parallel: "./js/Parallel.js",
        Split: "./js/Split.js",
        Template: "./js/Template.js"
    },
    output: {
        path: "/usr/share/nginx/html/",
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
