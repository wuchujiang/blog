module.exports = function(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录！');
        return res.redirect('/');
    }
    return next();
}