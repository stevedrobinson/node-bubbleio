(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('node-fetch'), require('lodash.omit'), require('qs')) :
  typeof define === 'function' && define.amd ? define(['node-fetch', 'lodash.omit', 'qs'], factory) :
  (global = global || self, global.nodeBubbleio = factory(global.nodeFetch, global.omit, global.qs));
})(this, (function (fetch, omit, qs) {
  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var fetch__default = /*#__PURE__*/_interopDefaultLegacy(fetch);
  var omit__default = /*#__PURE__*/_interopDefaultLegacy(omit);
  var qs__default = /*#__PURE__*/_interopDefaultLegacy(qs);

  let globalConfig = {};

  const getConfig = (obj = {}, prop, envProp) => {
    return obj[prop] || process.env[envProp];
  };

  const config = {
    set: newConfig => {
      const domain = getConfig(newConfig, 'domain', 'BUBBLE_DOMAIN');
      const apiToken = getConfig(newConfig, 'apiToken', 'BUBBLE_API_TOKEN');
      const isLive = ['true', 'TRUE', true].includes(getConfig(newConfig, 'isLive', 'BUBBLE_LIVE'));

      if (!domain) {
        throw new Error('You must provide a domain as an option (domain) or set a BUBBLE_DOMAIN environment variable');
      }

      if (!apiToken) {
        throw new Error('You must provide an API Token as an option (apiToken) or set a BUBBLE_API_TOKEN environment variable');
      }

      globalConfig = {
        domain,
        apiToken,
        isLive
      };
    },
    get: () => {
      return globalConfig;
    },

    getDefaultHeaders() {
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${globalConfig.apiToken}`
      };
    },

    getBaseUrl() {
      return `https://${globalConfig.domain}/${globalConfig.isLive ? '' : 'version-test'}/api/1.1/`;
    }

  };

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  const handleError$1 = error => {
    console.error(error);
    throw error;
  };

  const handleFetchResponse$1 = async response => {
    if (!response.ok) {
      const errorText = await response.text();
      console.error(errorText);
      throw errorText;
    }

    return response;
  };

  function buildSearchQuery(query) {
    if (!query) {
      return '';
    }

    const queryString = [];

    if (query != null && query.constraints) {
      queryString.push(`constraints=${encodeURIComponent(JSON.stringify(query.constraints))}`);
    }

    if (query != null && query.limit) {
      queryString.push(`limit=${query.limit}`);
    }

    if (query != null && query.cursor) {
      queryString.push(`cursor=${query.cursor}`);
    }

    if (query != null && query.sort_field) {
      queryString.push(`sort_field=${query.sort_field}`);
    }

    if (query != null && query.descending) {
      queryString.push(`descending=${query.descending}`);
    }

    if (query != null && query.additional_sort_fields) {
      queryString.push(`additional_sort_fields=${encodeURIComponent(JSON.stringify(query.additional_sort_fields))}`);
    }

    return queryString.length === 0 ? '' : `?${queryString.join('&')}`;
  }

  const sanitizeData = data => {
    return omit__default["default"](data, ['_id', 'Slug', 'Created By', 'Created Date', 'Modified Date', '_type']);
  };

  class DataAPI {
    constructor(args) {
      this['Created Date'] = void 0;
      this['Created By'] = void 0;
      this['Modified Date'] = void 0;
      this['Slug'] = void 0;
      this._id = void 0;
      Object.assign(this, args);
    }

    get baseUrl() {
      return `${config.getBaseUrl()}/obj/${this._type}`;
    }

    static async find(query) {
      const {
        baseUrl
      } = new this({});
      const response = await fetch__default["default"](`${baseUrl}${buildSearchQuery(query)}`, {
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);
      const responseData = await response.json();
      return _extends({}, responseData.response, {
        results: responseData.response.results.map(data => new this(data))
      });
    }

    static async get(id) {
      const {
        baseUrl
      } = new this({});
      const response = await fetch__default["default"](`${baseUrl}/${id}`, {
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);
      const responseData = await response.json();
      return new this(responseData.response);
    }

    static async create(data) {
      const {
        baseUrl
      } = new this({});
      const response = await fetch__default["default"](`${baseUrl}`, {
        method: 'POST',
        body: JSON.stringify(sanitizeData(data)),
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);
      const responseData = await response.json();
      return new this({
        _id: responseData.id
      }).refresh();
    }

    static async bulkCreate(data) {
      const {
        baseUrl
      } = new this({});
      const response = await fetch__default["default"](`${baseUrl}/bulk`, {
        method: 'POST',
        body: `${data.map(d => JSON.stringify(sanitizeData(d))).join('\n')}`,
        headers: _extends({}, config.getDefaultHeaders(), {
          'Content-Type': 'text/plain'
        })
      }).then(handleFetchResponse$1).catch(handleError$1);
      const responseData = await response.text();
      const results = JSON.parse(`[${responseData.replace(/\n/g, ',')}]`);
      const records = await Promise.all(results.map(r => new this({
        _id: r.id
      }).refresh()));
      return records;
    }

    async refresh() {
      const {
        baseUrl
      } = this;

      if (!this._id) {
        throw new Error('Cannot call refresh on an object with no _id');
      }

      const response = await fetch__default["default"](`${baseUrl}/${this._id}`, {
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);
      const responseData = await response.json();
      Object.assign(this, responseData.response);
      return this;
    }

    async save() {
      const {
        _id,
        baseUrl
      } = this;
      const isNew = !_id;
      const method = isNew ? 'POST' : 'PATCH';
      const response = await fetch__default["default"](`${baseUrl}${isNew ? '' : '/' + _id}`, {
        method,
        body: JSON.stringify(sanitizeData(this)),
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);

      if (isNew) {
        const responseData = await response.json();
        this._id = responseData.id;
      }

      return this.refresh();
    }

    async delete() {
      const {
        _id,
        baseUrl
      } = this;

      if (!_id) {
        throw new Error('Cannot call delete on an object with no _id');
      }

      const response = await fetch__default["default"](`${baseUrl}/${_id}`, {
        method: 'DELETE',
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse$1).catch(handleError$1);
      return response ? response.ok : false;
    }

  }

  const handleError = error => {
    console.error(error);
    throw error;
  };

  const handleFetchResponse = async response => {
    if (!response.ok) {
      const errorText = await response.text();
      console.error(errorText);
      throw errorText;
    }

    return response;
  };

  function buildRequestQuery(querystring) {
    if (!querystring) {
      return '';
    }

    return qs__default["default"].stringify(querystring, {
      addQueryPrefix: true
    });
  }

  class WorkflowAPI {
    constructor(options) {
      this._name = void 0;
      this._name = options.name;
    }

    get baseUrl() {
      return `${config.getBaseUrl()}/wf/${this._name}`;
    }

    async send(data, querystring) {
      const {
        baseUrl
      } = this;
      const response = await fetch__default["default"](`${baseUrl}${buildRequestQuery(querystring)}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: config.getDefaultHeaders()
      }).then(handleFetchResponse).catch(handleError);
      return response.json();
    }

  }

  const BubbleIO = {
    init: initialConfig => {
      config.set(initialConfig);
    },
    DataAPI,
    WorkflowAPI
  };

  return BubbleIO;

}));
//# sourceMappingURL=index.umd.js.map
