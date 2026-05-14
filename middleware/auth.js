function isAuthenticated(req, res, next) {
    if (req.session && req.session.user_id) {
        return next();
    }
    res.redirect('/login');
}

module.exports = { isAuthenticated };