const userModel = require("../Models/userModel")
const productModel = require("../Models/productModel")
const cartModel = require("../Models/cartModel")
const { isValid } = require("../validations/validator")
const { isValidObjectId } = require("mongoose")


//================================================ [ Create Cart API ] =============================================
const createCart = async (req, res) => {

    try {

        const userSaveId = req.loggedInUser.user
        const userId = req.params.userId

        if (userId) {

            if (!isValidObjectId(userId)) { return res.status(400).send({ message: "userId is InValid", status: false }) }

            if (userSaveId !== userId.toString()) { return res.status(403).send({ message: "user is not Authorised for this operation", status: false }) }

            const userData = await userModel.findOne({ _id: userId, isDeleted: false })

            if (!userData) {
                return res.status(404).send({ status: false, message: "No user register" })
            }

            if (Object.keys(req.body) == 0) {
                return res.status(400).send({ status: false, message: "No parameter provided" })
            }

            let { productId, quantity, cartId } = req.body

            if (!isValid(productId)) {
                return res.status(400).send({ status: false, message: "please provide productId" })
            }
            if (!isValidObjectId(productId)) {
                return res.status(400).send({ status: false, message: "Invalid productId" })
            }

            quantity = quantity || 1

            if (isNaN(quantity)) {
                return res.status(400).send({ status: false, message: "quntity should be number" })
            }
            if (typeof quantity !== "number") {
                return res.status(400).send({ status: false, message: "quntity should be number type" })
            }

            const productExist = await productModel.findOne({ _id: productId, isDeleted: false })

            if (!productExist) {
                return res.status(404).send({ status: false, message: "Product not found" })
            }

            // check the cart already exist or not 

            const cartExist = await cartModel.findOne({ userId }).lean()

            console.log(cartExist)

            console.log(cartExist)

            if (cartExist) {

                if (!isValid(cartId)) { return res.status(400).send({ status: false, message: "please provide cartId" }) }

                if (!isValidObjectId(cartId)) { return res.status(400).send({ status: false, message: "Invalid cartId" }) }

                console.log(cartExist._id)
                if (cartExist._id.toString() !== cartId) {
                    return res.status(400).send({ status: false, message: "cardId doesn't belong to the user" })
                }

                console.log(cartExist)

                for (let i = 0; i < (cartExist.items).length; i++) {
                    if (cartExist.items[i].productId == productId) {
                        cartExist.items[i].quantity = cartExist.items[i].quantity + quantity
                        cartExist.totalPrice = Math.round(cartExist.totalPrice + ((quantity) * (productExist.price)))


                        const updateCart = await cartModel.findOneAndUpdate({ _id: cartId }, cartExist, { new: true }).populate("items.productId", ["title", "price", "productImage"])

                        return res.status(201).send({ status: true, message: "Item added successfully and Cart updated!", data: updateCart })
                    }
                }

                cartExist.items.push({ productId: productId, quantity: quantity })
                cartExist.totalItems = cartExist.totalItems + 1

                cartExist.totalPrice = Math.round(cartExist.totalPrice + ((quantity) * (productExist.price)))
                console.log(cartExist)

                const addProduct = await cartModel.findOneAndUpdate({ _id: cartId }, cartExist, { new: true }).populate("items.productId", ["title", "price", "productImage"])

                return res.status(201).send({ status: true, message: "Item added successfully and Cart updated!", data: addProduct })

            }

            let totalPrice = Math.round(quantity * productExist.price)

            let obj = {
                userId,
                items: [{ productId: productId, quantity: quantity }],
                totalPrice,
                totalItems: 1
            }
            console.log(obj)
            const newCart = await cartModel.create(obj)

            const getCart = await cartModel.findOne({ _id: newCart._id }).populate("items.productId", ["title", "price", "productImage"])


            return res.status(201).send({ status: true, message: "cart create succefully", data: getCart })



        } else {
            return res.status(500).send({ status: false, message: "Please provide userId" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}

//================================================ [ Get Cart API ] =============================================
const getCart = async (req, res) => {
    try {

        const userSaveId = req.loggedInUser.user
        const userId = req.params.userId

        if (userId) {

            if (!isValidObjectId(userId)) { return res.status(400).send({ message: "userId is InValid", status: false }) }

            if (userSaveId !== userId) { return res.status(403).send({ message: "user is not Authorised for this operation", status: false }) }

            const userData = await userModel.findOne({ _id: userId, isDeleted: false })

            if (!userData) {
                return res.status(404).send({ status: false, message: "No user register" })
            }

            const cartData = await cartModel.findOne({ userId: userId, isDeleted: false }).populate("items.productId", ["title", "price", "productImage"])

            if (!cartData) {

                return res.status(400).send({ status: false, message: `cartData  doesn't exist or cartData is deleted` });

            };


            return res.status(200).send({ status: true, data: cartData });
        } else {
            return res.status.send({ status: false, message: "provide userId" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//================================================ [ Update Cart API ] =============================================
const updateCart = async function (req, res) {

    try {

        const userSaveId = req.loggedInUser.user
        const userId = req.params.userId

        if (userId) {

            if (!isValidObjectId(userId)) { return res.status(400).send({ message: "userId is InValid", status: false }) }

            if (userSaveId !== userId) { return res.status(403).send({ message: "user is not Authorised for this operation", status: false }) }

            const userData = await userModel.findOne({ _id: userId, isDeleted: false })

            if (!userData) {
                return res.status(404).send({ status: false, message: "No user register" })
            }

            let data = req.body
            let { productId, cartId, removeProduct } = data

            if (Object.keys(data).length == 0) {
                return res.status(400).send({ status: false, message: `Data required to update or remove form cart` })
            }

            if (!isValid(productId)) {
                return res.status(400).send({ status: false, message: `Please provide ProductId or Id: ${productId} should be valid` })
            }
            if (!isValidObjectId(productId)) {
                return res.status(400).send({ status: false, message: `ProductId : ${productId} should be valid` })
            }

            let findProduct = await productModel.findOne({ _id: productId })
            if (!findProduct) {
                return res.status(404).send({ status: false, message: `ProductId : ${productId} not existed in db` })
            }

            if (findProduct.isDeleted == true) {
                return res.status(404).send({ status: false, message: `This ProductId : ${productId} is already deleted` })
            }


            if (!isValid(cartId)) {
                return res.status(400).send({ status: false, message: `Please provide CartId or Id: ${cartId} should be valid` })
            }
            if (!isValidObjectId(cartId)) {
                return res.status(400).send({ status: false, message: `CartId : ${cartId} should be valid` })
            }

            let findCart = await cartModel.findOne({ _id: cartId })
            console.log(findCart)
            if (!findCart) {
                return res.status(404).send({ status: false, message: `CartId : ${cartId} not existed ` })
            }

            if (findCart.items.length == 0) {
                return res.status(404).send({ status: false, message: `You have not added any product in this Cart : ${cartId}` })
            }

            if (!isValid(removeProduct)) {
                return res.status(400).send({ status: false, message: `RemoveProduct is required` })
            }
            if (!/^[0-1]$/.test(removeProduct)) {
                return res.status(400).send({ status: false, message: `RemoveProduct will be accepted only 0 or 1` })
            }

            let cart = findCart.items
            // console.log(cart)

            for (let i = 0; i < cart.length; i++) {
                if (cart[i].productId == productId) {
                    let updatePrice = cart[i].quantity * findProduct.price


                    // directly remove a product from the cart if quantity  is 0
                    if (removeProduct == 0) {
                        let productRemoved = await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } }, totalPrice: findCart.totalPrice - updatePrice, totalItems: findCart.totalItems - 1 }, { new: true })
                        //    console.log(productRemoved)
                        return res.status(200).send({ status: true, message: `Product Removed Successfully`, data: productRemoved })
                    }

                    // remove the product if quantity is 1 or product is also 1
                    if (removeProduct == 1) {
                        if (cart[i].quantity == 1 && removeProduct == 1) {
                            let allRemovedProduct = await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } }, totalPrice: findCart.totalPrice - updatePrice, totalItems: findCart.totalItems - 1 }, { new: true })
                            //    console.log(updatePrice)
                            return res.status(200).send({ status: true, message: `No Products available in this cart`, data: allRemovedProduct })
                        }
                        else {
                            //decrementing the quantity of a product by 1 
                            cart[i].quantity = cart[i].quantity - 1
                            let cartUpdate = await cartModel.findByIdAndUpdate({ _id: cartId }, { items: cart, totalPrice: findCart.totalPrice - findProduct.price }, { new: true })

                            return res.status(200).send({ status: true, message: 'One Product removed successfully', data: cartUpdate })
                        }
                    }
                }

            }

        }
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


//================================================ [ Delete Cart API ] =============================================
const deleteCart = async function (req, res) {

    try {

        const userSaveId = req.loggedInUser.user
        const userId = req.params.userId

        if (userId) {

            if (!isValidObjectId(userId)) { return res.status(400).send({ message: "userId is InValid", status: false }) }

            if (userSaveId !== userId) { return res.status(403).send({ message: "user is not Authorised for this operation", status: false }) }

            const userData = await userModel.findOne({ _id: userId, isDeleted: false })

            if (!userData) {
                return res.status(404).send({ status: false, message: "No user register" })
            }

            const checkCart = await cartModel.findOneAndUpdate({ userId: userId }, { $set: { items: [], totalPrice: 0, totalItems: 0 } })

            if (checkCart && checkCart.totalItems == 0) {
                return res.status(400).send({ status: false, message: "Cart is already empty" })
            }
            if (!checkCart) { return res.status(404).send({ status: true, message: 'Cart Not Found' }) }

            return res.status(204).send({ status: true, message: "Cart Deleted successfully" })


        } else {
            return res.status(400).send({ status: false, message: "provide UserId" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}





module.exports.createCart = createCart
module.exports.getCart = getCart
module.exports.updateCart = updateCart
module.exports.deleteCart = deleteCart