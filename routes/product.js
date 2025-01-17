var express = require('express');
var router = express.Router();
const mysql = require('mysql');
const dbConfig = require('../config/db');
const { authenticateToken } = require('./auth');

/**
 * 创建数据库连接
 * @returns {mysql.Connection} 数据库连接对象
 */
function createConnection() {
  return mysql.createConnection(dbConfig);
}

/**
 * 获取所有产品，根据查询参数过滤
 * @name GET /products
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 * @param {Object} req.query - 查询参数
 * @param {string} [req.query.shop_id] - 店铺 ID
 * @param {number} [req.query.category_id] - 分类 ID
 * @param {string} [req.query.name] - 产品名称
 * @param {number} [req.query.min_price] - 最低价格
 * @param {number} [req.query.max_price] - 最高价格
 */
router.get('/', authenticateToken, function(req, res, next) {
  const connection = createConnection();
  connection.connect();

  // 获取查询参数
  const { shop_id, category_id, name, min_price, max_price } = req.query;

  let query = 'SELECT * FROM products';
  const values = [];

  // 添加查询条件
  if (category_id) {
    query += ' WHERE category_id = ?';
    values.push(category_id);
  }

  if (shop_id) {
    // 如果已有条件，用 AND 连接
    if (values.length > 0) {
      query += ' AND shop_id = ?';
    } else {
      query += ' WHERE shop_id = ?';
    }
    values.push(shop_id);
  }

  if (name) {
    // 如果已有条件，用 AND 连接
    if (values.length > 0) {
      query += ' AND name LIKE ?';
    } else {
      query += ' WHERE name LIKE ?';
    }
    values.push(`%${name}%`);
  }

  if (min_price || max_price) {
    // 如果已有条件，用 AND 连接
    if (values.length > 0) {
      query += ' AND price BETWEEN ? AND ?';
    } else {
      query += ' WHERE price BETWEEN ? AND ?';
    }
    values.push(min_price || 0); // 如果 min_price 为空，默认为 0
    values.push(max_price || 9999999); // 如果 max_price 为空，默认为一个很大的数
  }

  connection.query(query, values, function(error, results, fields) {
    if (error) {
      console.error('Error fetching products:', error);
      res.status(500).send({ message: 'Error fetching products', error });
      connection.end();
      return;
    }
    res.json(results);
    connection.end();
  });
});

/**
 * 根据 product_id 获取指定产品及其收藏状态
 * @name GET /products/:product_id
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 * @param {string} req.params.product_id - 产品的 ID
 * @param {Object} req.user - 认证用户对象
 * @param {string} req.user.id - 用户 ID
 */
router.get('/:product_id', authenticateToken, function(req, res, next) {
  const { product_id } = req.params;
  const connection = createConnection();
  connection.connect();

  let collect = {};
  const user_id = req.user.id; // 从 JWT 中获取用户 ID

  // 查询用户是否收藏该产品
  const query2 = 'SELECT * FROM user_product_collect WHERE product_id = ? AND user_id = ?';
  connection.query(query2, [product_id, user_id], function (error, results, fields) {
    if (error) {
      console.error('Error fetching collection status:', error);
      res.status(500).send({ message: 'Error fetching collection status', error });
      connection.end();
      return;
    }

    if (results.length > 0) {
      collect = results[0];
    }

    // 查询指定 product_id 的产品
    const query = 'SELECT * FROM products WHERE product_id = ?';
    connection.query(query, [product_id], function (error, results, fields) {
      if (error) {
        console.error('Error fetching product:', error);
        res.status(500).send({ message: 'Error fetching product', error });
        connection.end();
        return;
      }

      if (results.length > 0) {
        results[0].collect = collect;
        res.json(results[0]);
      } else {
        res.status(404).send({ message: 'Product not found' });
      }

      connection.end();
    });
  });
});

/**
 * 创建新产品或更新现有产品
 * @name POST /products
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 * @param {Object} req.body - 产品数据
 * @param {string} req.body.shop_id - 店铺 ID
 * @param {string} req.body.product_id - 产品 ID（用于更新）
 * @param {string} req.body.image_url - 产品图片 URL
 * @param {string} req.body.name - 产品名称
 * @param {number} req.body.price - 产品价格
 * @param {string} req.body.description - 产品描述
 * @param {number} req.body.category_id - 产品分类 ID
 * @param {string} req.body.openid - 产品开放 ID
 */
router.post('/', authenticateToken, function(req, res, next) {
  const { shop_id, product_id, image_url, name, price, description, category_id, openid } = req.body;
  const connection = createConnection();
  connection.connect();

  // 检查产品是否存在
  const checkQuery = 'SELECT * FROM products WHERE product_id = ?';
  connection.query(checkQuery, [product_id], function (error, results, fields) {
    if (error) {
      console.error('Error checking product:', error);
      res.status(500).send({ message: 'Error checking product', error });
      connection.end();
      return;
    }

    if (results.length > 0) {
      // 产品已存在，更新产品信息
      const updateQuery = 'UPDATE products SET shop_id = ?, image_url = ?, name = ?, price = ?, description = ?, category_id = ?, openid = ? WHERE product_id = ?';
      connection.query(updateQuery, [shop_id, image_url, name, price, description, category_id, openid, product_id], function (error, results, fields) {
        if (error) {
          console.error('Error updating product:', error);
          res.status(500).send({ message: 'Error updating product', error });
          connection.end();
          return;
        }
        res.json({ id: product_id, message: 'Product updated successfully' });
        connection.end();
      });
    } else {
      // 产品不存在，插入新产品
      const insertQuery = 'INSERT INTO products (shop_id, image_url, name, price, description, category_id, openid) VALUES (?, ?, ?, ?, ?, ?, ?)';
      connection.query(insertQuery, [shop_id, image_url, name, price, description, category_id, openid], function (error, results, fields) {
        if (error) {
          console.error('Error saving product:', error);
          res.status(500).send({ message: 'Error saving product', error });
          connection.end();
          return;
        }
        res.json({ id: results.insertId, message: 'Product saved successfully' });
        connection.end();
      });
    }
  });
});

/**
 * 根据 product_id 删除指定产品
 * @name DELETE /products/:product_id
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 * @param {string} req.params.product_id - 产品的 ID
 */
router.delete('/:product_id', authenticateToken, function(req, res, next) {
  const { product_id } = req.params;
  const connection = createConnection();
  connection.connect();

  // 删除指定 product_id 的产品
  const query = 'DELETE FROM products WHERE product_id = ?';
  connection.query(query, [product_id], function (error, results, fields) {
    if (error) {
      console.error('Error deleting product:', error);
      res.status(500).send({ message: 'Error deleting product', error });
      connection.end();
      return;
    }

    if (results.affectedRows > 0) {
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).send({ message: 'Product not found' });
    }

    connection.end();
  });
});

module.exports = router;
