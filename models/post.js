var mongodb = require('./db');
var markdown = require('markdown').markdown;

function Post(name, title, tags, post) {
    this.name = name;
    this.title = title;
    this.post = post;
    this.tags = tags;
}

Post.prototype.save = function(callback) {
    var date = new Date();
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };
    var post = {
        name: this.name,
        time: time,
        post: this.post,
        title: this.title,
        comments: [],
        tags: this.tags,
        pv: 0
    }

    //打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.insert(post, {
                safe: true,
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        })
    })
}

Post.getTen = function(name, page, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            var query = {};
            if (name) {
                query.name = name;
            }

            //使用 count 返回特定查询的文档数 total
            collection.count(query, function(err, total) {
                //根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10,
                }).sort({
                    time: -1
                }).toArray(function(err, docs) {
                    mongodb.close();
                    if (err || docs == null) {
                        return callback(err);
                    }
                    //解析 markdown 为 html
                    docs.forEach(function(doc) {
                        doc.post = markdown.toHTML(doc.post);
                    });
                    callback(null, docs, total);
                });
            });

        })
    })
}

Post.getOne = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: name,
                "time.day": day,
                title: title
            }, function(err, doc) {
                
                if (err || doc == null) {
                    mongodb.close();
                    return callback(err);
                }

                if (doc) {
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {"pv": 1}
                    }, function() {
                        mongodb.close();
                        if (err) {
                          return callback(err);
                        }
                    });
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function(comment) {
                        comment.content = markdown.toHTML(comment.content);
                    });
                }
                callback(null, doc);
            })
        })
    })
}

Post.edit = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.findOne({
                name: name,
                "time.day": day,
                title: title
            }, function(err, doc) {
                console.log(44);
                mongodb.close();
                if (err) {
                    return callback(err);
                }

                callback(null, doc);
            })
        })
    })
}

Post.update = function(name, day, title, post, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }

            collection.update({
                name: name,
                "time.day": day,
                title: title
            }, {
                $set: { post: post }
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        })
    })
}

Post.getArchive = function(callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    })
}

//返回所有标签
Post.getTags = function(callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //distinct 用来找出给定键的所有不同值
            collection.distinct("tags", function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTag = function(tag, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //查询所有 tags 数组内包含 tag 的文档
            //并返回只含有 name、time、title 组成的数组
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function(err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

module.exports = Post;
