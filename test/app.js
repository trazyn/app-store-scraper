import appleStore from "../index";

(async () => {
  try {
    const appStoreDetails = await appleStore.app({
      id: "1628970855",
      country: "id",
      lang: "en",
      metadata: true,
    });
    console.log(appStoreDetails);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
