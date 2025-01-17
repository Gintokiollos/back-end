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
 * 获取所有产品
 * @name GET /products
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 */
router.get('/', authenticateToken, function(req, res, next) {
  const connection = createConnection();
  connection.connect();

  // 查询所有产品
  connection.query('SELECT * FROM products', function (error, results, fields) {
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
 * 根据 product_id 获取指定产品
 * @name GET /products/:product_id
 * @function
 * @memberof module:routes/products
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @param {express.NextFunction} next - Express 下一个中间件函数
 * @param {string} req.params.product_id - 产品的 ID
 */
router.get('/:product_id', authenticateToken, function(req, res, next) {
  const { product_id } = req.params;
  const connection = createConnection();
  connection.connect();

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
      res.json(results[0]);
    } else {
      res.status(404).send({ message: 'Product not found' });
    }

    connection.end();
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
 * @param {string} req.body.product_id - 产品 ID（用于更新）
 * @param {string} req.body.image_url - 产品图片 URL
 * @param {string} req.body.name - 产品名称
 * @param {number} req.body.price - 产品价格
 * @param {string} req.body.description - 产品描述
 * @param {number} req.body.category_id - 产品分类 ID
 * @param {string} req.body.openid - 产品开放 ID
 */
router.post('/', authenticateToken, function(req, res, next) {
  const { product_id, image_url, name, price, description, category_id, openid } = req.body;
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
      const updateQuery = 'UPDATE products SET image_url = ?, name = ?, price = ?, description = ?, category_id = ?, openid = ? WHERE product_id = ?';
      connection.query(updateQuery, [image_url, name, price, description, category_id, openid, product_id], function (error, results, fields) {
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
      const insertQuery = 'INSERT INTO products (image_url, name, price, description, category_id, openid) VALUES (?, ?, ?, ?, ?, ?)';
      connection.query(insertQuery, [image_url, name, price, description, category_id, openid], function (error, results, fields) {
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
