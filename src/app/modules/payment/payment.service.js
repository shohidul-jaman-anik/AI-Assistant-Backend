const Payment = require("./payment.model");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);



exports.createPaymentService = async (amount) => {
    const payment = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
            "card"
        ],
    })

    return payment;
}

module.exports.getTenantsPaymentService = async (userEmail) => {
    const result = await Payment.find({ 'formData.email': userEmail });
    return result;
}


module.exports.getOwnerPaymentService = async (userEmail) => {
    const results = await Payment.find({ ownerEmail: userEmail });
    return results;
}



module.exports.getAllPaymentService = async () => {
    const results = await Payment.find({});


    const processedResults = results.map(payment => {
        const price = parseFloat(payment.price) || 0;
        const propertyType = payment.propertyType.split(" ")[0];
        const transactionId = payment.transactionId.slice(0, 9);
        const subTotal = price * payment.quantity;


        return {
            ...payment.toObject(),
            propertyType,
            transactionId,
            subTotal,
        };
    });


    return processedResults;
}


module.exports.calculateMonthlyStatisticsService = async (sellerEmail) => {
    const monthlyStats = await Payment.aggregate([
        {
            $match: { ownerEmail: sellerEmail } // Filter by seller email
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$formData.date" } },
                income: { $sum: { $multiply: ["$price", "$quantity"] } }, // Calculate income
                expenses: { $sum: { $multiply: ["$price", "$quantity", { $divide: ["$discount", 100] }] } }, // Calculate expenses considering discount
                count: { $sum: 1 } // Count new orders
            }
        },
        {
            $project: {
                _id: 0,
                month: "$_id",
                income: 1,
                expenses: 1,
                count: 1,
                averageOrderValue: { $divide: ["$income", "$count"] }, // Calculate average order value
                revenue: { $add: ["$income", "$expenses"] }, // Calculate revenue
                profit: { $subtract: ["$income", "$expenses"] } // Calculate profit
            }
        }
    ]);


    return monthlyStats;
}


module.exports.calculateYearlyStatisticsService = async (sellerEmail) => {
    const yearlyStats = await Payment.aggregate([
        {
            $match: { ownerEmail: sellerEmail } // Filter by seller email
        },
        {
            $group: {
                _id: {
                    year: { $dateToString: { format: "%Y", date: "$formData.date" } },
                    orderID: "$_id" // Group by order ID to count orders
                },
                income: { $sum: { $multiply: ["$price", "$quantity"] } }, // Calculate income
                expenses: { $sum: { $multiply: ["$price", "$quantity", { $divide: ["$discount", 100] }] } }, // Calculate expenses considering discount
                salesVolume: { $sum: "$quantity" } // Calculate sales volume
            }
        },
        {
            $group: {
                _id: "$_id.year",
                income: { $sum: "$income" },
                expenses: { $sum: "$expenses" },
                profit: { $sum: { $subtract: ["$income", "$expenses"] } }, // Calculate profit
                totalOrderValue: { $sum: { $add: ["$income", "$expenses"] } }, // Calculate total order value
                totalOrders: { $sum: 1 }, // Count the number of orders
                salesVolume: { $sum: "$salesVolume" } // Calculate total sales volume
            }
        },
        {
            $project: {
                _id: 0,
                year: "$_id",
                income: 1,
                expenses: 1,
                profit: 1,
                totalOrderValue: 1,
                totalOrders: 1,
                salesVolume: 1,
                incomePercentage: { $multiply: [{ $divide: ["$income", "$totalOrderValue"] }, 100] },
                expensesPercentage: { $multiply: [{ $divide: ["$expenses", "$totalOrderValue"] }, 100] },
                orderPercentage: { $multiply: [{ $divide: ["$profit", "$totalOrderValue"] }, 100] } // Calculate order percentage (profit margin)
            }
        }
    ]);
    return yearlyStats;
}




module.exports.calculateQuarterlyStatisticsService = async (sellerEmail) => {
    const quarterlyStats = await Payment.aggregate([
        {
            $match: { ownerEmail: sellerEmail } // Filter by seller email
        },
        {
            $group: {
                _id: {
                    quarter: {
                        $let: {
                            vars: {
                                month: { $month: { $toDate: "$formData.date" } },
                                year: { $year: { $toDate: "$formData.date" } }
                            },
                            in: {
                                $concat: [
                                    "Q",
                                    {
                                        $cond: [
                                            { $lte: ["$$month", 3] },
                                            "1",
                                            {
                                                $cond: [
                                                    { $lte: ["$$month", 6] },
                                                    "2",
                                                    {
                                                        $cond: [
                                                            { $lte: ["$$month", 9] },
                                                            "3",
                                                            "4"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    "-",
                                    { $toString: "$$year" }
                                ]
                            }
                        }
                    },
                    propertyType: "$propertyType"
                },
                value: { $sum: { $multiply: ["$price", "$quantity"] } },
            }
        },
        {
            $group: {
                _id: "$_id.quarter",
                categories: { $push: { propertyType: "$_id.propertyType", value: "$value" } }
            }
        },
        {
            $project: {
                _id: 0,
                name: "$_id",
                categories: 1
            }
        }
    ]);

    // Assigning trend values to quarterly statistics
    const quarterStatistics = quarterlyStats.map((quarter, index) => ({
        ...quarter,
    }));


    return quarterStatistics;
};


module.exports.getSinglePaymentService = async (id) => {
    const singlePayment = await Payment.findOne({ _id: id });
    const price = parseFloat(singlePayment.price) || 0;
    const subTotal = price * singlePayment.quantity;


    return {
        ...singlePayment.toObject(),
        subTotal
    };
};


exports.updatePaymentService = async (payments) => {
    if (!Array.isArray(payments)) {
        payments = [payments];
    }

    // const updateOperations = payments.map(async (payment) => {
    //     const filter = { _id: ObjectId(payment.payment) };
    //     const updateDoc = {
    //         $set: {
    //             paid: true,
    //             transactionId: payment.transactionId,
    //         }
    //     };
    //     await AddToCart.updateOne(filter, updateDoc, { runValidators: true });
    // });

    // await Promise.all(updateOperations);

    const insertPayment = await Payment.insertMany(payments);
    return insertPayment
}

exports.deletePaymentService = async (id) => {
    const result = await Payment.deleteOne({ _id: id })
    return result
}

