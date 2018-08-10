var _ = require("lodash")

var request = require("express/lib/request")

module.exports = function (app) {
    // Add middleware to app to add req.runMiddleware
    app.use((req, res, next) => {
        req.runMiddleware = (path, options, callback) => {
            if (_.isFunction(options)) {
                callback = options
                options = {}
            }
            options.original_req = req
            options.original_res = res
            app.runMiddleware(path, options, callback)
        }
        next()
    })

    // Check to make sure app.runMiddleware hasn't already been added
    if (app.runMiddleware) return

    // Add runMiddleware to the app object
    app.runMiddleware = function (path, options, callback) {
        if (callback) callback = _.once(callback)
        if (typeof options === "function") {
            callback = options
            options = null
        }
        options = options || {}
        options.url = path
        let new_req, new_res
        if (options.original_req) {
            new_req = options.original_req
            for (let i in options) {
                if (i === "original_req") continue
                new_req[i] = options[i]
            }
        } else {
            new_req = createReq(path, options)
        }
        new_res = createRes(callback)
        app(new_req, new_res)
    }
}

/**
 * Create synthetic request object
 * @param {string} path
 * @param {Object} options
 * @returns {Object} request
 */
function createReq(path, options) {
    if (!options) options = {}
    const req = _.extend(
        {
            method: "GET",
            host: "",
            cookies: {},
            query: {},
            url: path,
            headers: {},
        },
        options
    )
    req.method = req.method.toUpperCase()
    return req
}

/**
 * Create synthetic response object
 * @param {Function} callback
 * @returns {Object} response
 */
function createRes(callback) {
    const res = {
        _removedHeader: {},
    }
    const headers = {}
    let code = 200
    res.set = res.header = (header, value) => {
        headers[header] = value
        return res
    }
    res.status = function (number) {
        code = number
        return res
    }
    res.end = res.send = res.write = function (data) {
        if (callback) callback(code, data, headers)
    }
    return res
}
