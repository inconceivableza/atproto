import { GeneratedAlways } from "kysely"

const recipePostTableName = 'recipe_post'

export interface RecipePost {
    uri: string
    cid: string
    creator: string
    title: string
    text: string
    createdAt: string
    indexedAt: string
    sortAt: GeneratedAlways<string>
}

const recipeStepTableName = "recipe_step"

export interface RecipeStep {
    recipePostURI: string
    order: number,
    text: string
}

const recipeIngredientTableName = "recipe_ingredient"

export interface RecipeIngredient {
    recipePostURI: string
    order: number
    ingredient: string
    quantity: number
    unit: string
}

export type PartialDB = {
    [recipePostTableName]: RecipePost,
    [recipeStepTableName]: RecipeStep,
    [recipeIngredientTableName]: RecipeIngredient
}


