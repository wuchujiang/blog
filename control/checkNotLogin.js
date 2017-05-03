module.exports = function(req, res, next) {
	console.log(1)
    if (!req.session.user) {
        req.flash('error', '未登录！');
        return res.redirect('/login');
    }
    return next();
}