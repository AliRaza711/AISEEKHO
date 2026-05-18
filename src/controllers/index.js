const { ExampleService } = require('../services');

class ExampleController {
  static getHelloWorld(req, res) {
    try {
      const data = ExampleService.getHelloWorld();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = {
  ExampleController
};
