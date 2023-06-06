("use strict");

const stripe = require("stripe")(process.env.STRIPE_KEY);

const createCoreController = require("@strapi/strapi").factories.createCoreController;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi.query("product").findOne({ id: product.id });
    
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.title,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );
    
      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'UA'] },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}?success=true`,
        cancel_url: `${process.env.CLIENT_URL}?success=false`,
        line_items: lineItems,
      });
    
      await strapi.query("order").create({ products, stripeId: session.id });
    
      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));