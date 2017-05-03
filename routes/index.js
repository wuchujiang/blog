var express = require('express');
var crypto = require('crypto');
var User = require('../models/user');
var Post = require('../models/post');
var Comment = require('../models/comment');
var router = express.Router();
var checkLogin = require('../control/checkLogin');
var checkNotLogin = require('../control/checkNotLogin');
var multer = require('multer');
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/images');
    },

    filename: function(req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

var upload = multer({
    storage: storage
})

/* GET home page. */
router.get('/', function(req, res, next) {
    var page = req.query.p ? parseInt(req.query.p) : 1;
    Post.getTen(null, page, function(err, posts, total) {
        if (err) {
            posts = []
        }
        res.render('index', {
            title: '首页',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            posts: posts,
            page: page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + posts.length) == total,
        });
    })

});

router.get('/reg', function(req, res, next) {
    res.render('reg', {
        title: '注册',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});

router.post('/reg', function(req, res, next) {
    var name = req.body.name,
        password = req.body.password,
        passwordTwo = req.body.passwordTwo,
        email = req.body.email;
    if (password !== passwordTwo) {
        req.flash('error', '输入的密码错误~~');
        return res.redirect('/reg');
    }

    //生成密码的md5；
    var md5 = crypto.createHash('md5');
    password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
        name: name,
        password: password,
        email: email
    });

    //检查用户名是否存在
    User.get(newUser.name, function(err, user) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }

        //
        if (user) {
            req.flash('error', '用户已存在');
            return res.redirect('/reg');
        }

        //如果不存在就新增加用户
        newUser.save(function(err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/reg'); //注册失败返回主册页
            }
            console.log(user);
            req.session.user = user; //用户信息存入 session
            req.flash('success', '注册成功!');
            res.redirect('/'); //注册成功后返回主页
        })

    })

});

router.get('/login', function(req, res, next) {

    res.render('login', {
        title: '登录',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});

router.post('/login', function(req, res, next) {
    var md5 = crypto.createHash('md5');
    password = md5.update(req.body.password).digest('hex');

    User.get(req.body.name, function(err, user) {

        if (!user) {
            req.flash('error', '用户不存在');
            return res.redirect('/login');
        }
        if (user.password != password) {
            req.flash('error', '密码错误！');
            return res.redirect('/login');
        }
        req.session.user = user;
        req.flash('success', '登录成功');
        res.redirect('/');

    })
});

router.get('/post', checkNotLogin, function(req, res, next) {
    res.render('post', {
        title: '发表',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});

router.post('/post', function(req, res, next) {
    var currentUser = req.session.user;
    var tags = [req.body.tag1, req.body.tag2, req.body.tag3];
    var post = new Post(currentUser.name, req.body.title, tags, req.body.post);
    post.save(function(err) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }

        req.flash('success', '发布成功!');
        res.redirect('/'); //发表成功跳转到主页
    })
});

router.get('/logout', checkNotLogin, function(req, res, next) {
    req.session.user = null;
    req.flash('success', '退出！');
    res.redirect('/');
});

router.get('/upload', checkNotLogin, function(req, res, next) {
    res.render('upload', {
        title: '文件上传',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});

router.get('/u/:name', function(req, res, next) {
    var page = req.query.p ? parseInt(req.query.p) : 1;
    User.get(req.params.name, function(err, user) {
        if (!user) {
            req.flash('error', '用户不存在!');
            return res.redirect('/'); //用户不存在则跳转到主页
        }

        Post.getTen(user.name, page, function(err, posts, total) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('user', {
                title: user.name,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + posts.length) == total
            })
        })
    })
});

router.get('/u/:name/:day/:title', function(req, res, next) {
    Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('article', {
            title: req.params.title,
            post: post,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    })

});

router.post('/u/:name/:day/:title', function(req, res, next) {
    var date = new Date();
    var time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    var comment = {
        name: req.body.name,
        email: req.body.email,
        website: req.body.website,
        time: time,
        content: req.body.content
    };

    var newContent = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newContent.save(function(err) {
        if (err) {
            req.flash('error', err);
            return res.redirect('back');
        }
        req.flash('success', '留言成功!');
        res.redirect('back');
    });
});

router.get('/edit/:name/:day/:title', checkNotLogin, function(req, res, next) {
    var currentUser = req.session.user;
    Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post) {
        if (err) {
            req.flash('error', err);
            return res.redirect('back');
        }

        res.render('edit', {
            title: '编辑',
            post: post,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

});

router.post('/edit/:name/:day/:title', checkNotLogin, function(req, res, next) {
    var currentUser = req.session.user;
    Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err) {
        var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
        if (err) {
            req.flash('error', err);
            return res.redirect(url); //出错！返回文章页
        }
        req.flash('success', '修改成功!');
        res.redirect(url); //成功！返回文章页
    });
});

router.post('/upload', upload.single('avatar'), function(req, res) {
    req.flash('success', '文件上传成功!');
    res.redirect('/upload');
});

router.get('/archive', function(req, res, next) {
    Post.getArchive(function(err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('archive', {
            title: '存档',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

router.get('/tags', function(req, res) {
    Post.getTags(function(err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('tags', {
            title: '标签',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

router.get('/tags/:tag', function(req, res) {
    Post.getTag(req.params.tag, function(err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('tag', {
            title: 'TAG:' + req.params.tag,
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});

module.exports = router;
