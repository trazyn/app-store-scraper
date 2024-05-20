"use strict";

const cheerio = require("cheerio");
const common = require("./common");

function story(url) {
	return new Promise(function (resolve) {
		if (!url) {
			throw Error("url is required");
		}

		resolve(common.request(url, {}, {}));
	}).then((html) => {
		if (html.length === 0) {
			throw Error("App not found (404)");
		}

		return parseHtml(html);
	});
}

module.exports = story;

function parseHtml(html) {
	const $ = cheerio.load(html);

	const ele = $("script#shoebox-media-api-cache-apps");
	const data = JSON.parse(ele.html());
	const parsed = JSON.parse(data[Object.keys(data)[0]]);

	console.log(">>>>:", parsed);

	return Array.from(parsed.d[0].relationships["app-events"].data).map((e) => {
		const attrs = e.attributes;
		return {
			badgeKind: attrs.badgeKind,
			description: attrs.description,
			endDate: attrs.endDate,
			kind: attrs.kind,
			name: attrs.name,
			promotionStartDate: attrs.promotionStartDate,
			startDate: attrs.startDate,
			subtitle: attrs.subtitle,
			url: attrs.url,
			lockupArtwork: attrs.lockupArtwork,
		};
	});
}
