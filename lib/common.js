'use strict';

const request = require('axios').default;
const debug = require('debug')('app-store-scraper');
const c = require('./constants');
const https = require('https');

const httpsAgent = new https.Agent({
  secureProtocol: 'TLSv1_2_method', // Specify the TLS version, e.g., 'TLSv1_2_method' for TLS 1.2
  rejectUnauthorized: false, // Reject self-signed certificates
});

function cleanApp(app) {
  return {
    id: app.trackId,
    appId: app.bundleId,
    title: app.trackName,
    url: app.trackViewUrl,
    description: app.description,
    icon: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60,
    genres: app.genres,
    genreIds: app.genreIds,
    primaryGenre: app.primaryGenreName,
    primaryGenreId: app.primaryGenreId,
    contentRating: app.contentAdvisoryRating,
    languages: app.languageCodesISO2A,
    size: app.fileSizeBytes,
    requiredOsVersion: app.minimumOsVersion,
    released: app.releaseDate,
    updated: app.currentVersionReleaseDate || app.releaseDate,
    releaseNotes: app.releaseNotes,
    version: app.version,
    price: app.price,
    currency: app.currency,
    free: app.price === 0,
    developerId: app.artistId,
    developer: app.artistName,
    developerUrl: app.artistViewUrl,
    developerWebsite: app.sellerUrl,
    score: app.averageUserRating,
    reviews: app.userRatingCount,
    currentVersionScore: app.averageUserRatingForCurrentVersion,
    currentVersionReviews: app.userRatingCountForCurrentVersion,
    screenshots: app.screenshotUrls,
    ipadScreenshots: app.ipadScreenshotUrls,
    appletvScreenshots: app.appletvScreenshotUrls,
    supportedDevices: app.supportedDevices,
  };
}

// TODO add an optional parse function
const doRequest = (url, headers, requestOptions, limit) =>
  new Promise(function (resolve, reject) {
    debug('Making request: %s %j %o', url, headers, requestOptions);

    requestOptions = Object.assign(
      { method: 'GET', responseType: 'JSON', httpsAgent },
      requestOptions
    );

    let req = request;
    if (limit) {
      console.warn(
        'DEPRECATED: `limit` option is deprecated and will be removed in future versions'
      );
      req = request;
    }
    const opts = Object.assign({ url, headers }, requestOptions);

    req(opts)
      .then((response) => {
        if (response.status >= 400) {
          return reject({ response });
        }
        debug('Finished request');
        resolve(response.data);
      })
      .catch(reject);
  });

const LOOKUP_URL = 'https://itunes.apple.com/lookup';

function lookup(ids, idField, country, lang, requestOptions, limit) {
  idField = idField || 'id';
  country = country || 'us';
  const langParam = lang ? `&lang=${lang}` : '';
  const joinedIds = ids.join(',');
  const url = `${LOOKUP_URL}?${idField}=${joinedIds}&country=${country}&entity=software${langParam}`;
  return doRequest(url, {}, requestOptions, limit)
    .then(JSON.parse)
    .then((res) =>
      res.results.filter(function (app) {
        return (
          typeof app.wrapperType === 'undefined' ||
          app.wrapperType === 'software'
        );
      })
    )
    .then((res) => res.map(cleanApp));
}

function storeId(countryCode) {
  const markets = c.markets;
  const defaultStore = '143441';
  return (countryCode && markets[countryCode.toUpperCase()]) || defaultStore;
}

module.exports = { cleanApp, lookup, request: doRequest, storeId };
