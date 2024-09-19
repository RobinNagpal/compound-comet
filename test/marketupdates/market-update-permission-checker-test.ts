describe("MarketUpdatePermissionChecker", () => {
  it("only the owner can update the market admin", async () => {});

  it("only the owner can set the market admin pause guardian", async () => {});

  it("only the onwner can pause the market admin", async () => {});

  it("only the owner can resume the market admin", async () => {});

  it("should throw an error if the passed address is not market admin when checking permission", async () => {});

  it("should throw an error if the passed address is governor(timelock) when checking permission", async () => {});

  it("should throw and error if the passed address is market admin but market admin is paused", async () => {});

  it("should not throw an error if the passed address is market admin and market admin is not paused", async () => {});

});
